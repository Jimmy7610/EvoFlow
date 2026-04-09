/* 
 * EvoFlow AI Ops - Executor V4 patch
 * Drop-in replacement candidate for: workers/executor/src/index.ts
 *
 * Goals:
 * - Preserve the exact input payload as sent from the UI
 * - Support direct mode for exact responses
 * - Support multi-step mode for agent workflows
 * - Use memory only when it is actually relevant
 *
 * IMPORTANT:
 * Because this file was produced without direct access to your repo, it is written to be
 * conservative and easy to adapt. Replace the DB helpers with your project's existing ones
 * if their names differ. The core V4 logic is isolated in processRunV4().
 */

import 'dotenv/config';
import { getRelevantMemory, buildMemorySummary } from './lib/memory';
import { generateDirectReply, generateMultiStepReply } from './lib/ollama';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type RunRecord = {
  id: string;
  status: string;
  input: JsonValue;
  output?: JsonValue | null;
};

type NormalizedRunInput = {
  message: string;
  mode: 'direct' | 'multi-step';
  [key: string]: JsonValue | undefined;
};

const POLL_INTERVAL_MS = Number(process.env.EXECUTOR_POLL_INTERVAL_MS || 2500);

/**
 * -----------------------------
 * Project-specific DB adapters
 * -----------------------------
 * Replace these with your real database calls if needed.
 */
async function getQueuedRun(): Promise<RunRecord | null> {
  // TODO: swap with your actual DB implementation.
  return null;
}

async function markRunStarted(runId: string): Promise<void> {
  // TODO: swap with your actual DB implementation.
  console.log(`[executor] markRunStarted(${runId})`);
}

async function markRunCompleted(runId: string, output: JsonValue): Promise<void> {
  // TODO: swap with your actual DB implementation.
  console.log(`[executor] markRunCompleted(${runId})`);
  console.dir(output, { depth: 10 });
}

async function markRunFailed(runId: string, errorMessage: string): Promise<void> {
  // TODO: swap with your actual DB implementation.
  console.error(`[executor] markRunFailed(${runId}): ${errorMessage}`);
}

async function getRecentCompletedRuns(limit = 20): Promise<RunRecord[]> {
  // TODO: swap with your actual DB implementation.
  return [];
}

/**
 * -----------------------------
 * Core V4 helpers
 * -----------------------------
 */

function normalizeInput(input: JsonValue): NormalizedRunInput {
  const fallback: NormalizedRunInput = {
    message: '',
    mode: 'multi-step',
  };

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return fallback;
  }

  const raw = input as Record<string, JsonValue>;
  const message = typeof raw.message === 'string' ? raw.message : '';
  const mode = raw.mode === 'direct' ? 'direct' : 'multi-step';

  return {
    ...raw,
    message,
    mode,
  };
}

function shouldForceExactReply(message: string, mode: 'direct' | 'multi-step'): boolean {
  if (mode !== 'direct') return false;
  const lower = message.toLowerCase();

  return (
    lower.includes('svara bara med ordet') ||
    lower.includes('reply with only') ||
    lower.includes('answer only with') ||
    lower.includes('only the word') ||
    lower.includes('bara med ordet')
  );
}

function extractForcedWord(message: string): string | null {
  const patterns = [
    /svara bara med ordet\s+([^\s"'.!,?]+)/i,
    /answer only with\s+([^\s"'.!,?]+)/i,
    /reply with only\s+([^\s"'.!,?]+)/i,
    /only the word\s+([^\s"'.!,?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

async function processRunV4(run: RunRecord) {
  const normalized = normalizeInput(run.input);
  const message = normalized.message.trim();
  const mode = normalized.mode;

  const previousRuns = await getRecentCompletedRuns(20);
  const relevantMemory = getRelevantMemory(message, previousRuns, {
    maxItems: 5,
    minScore: 0.18,
  });
  const memorySummary = buildMemorySummary(relevantMemory);

  const forcedExactWord = shouldForceExactReply(message, mode) ? extractForcedWord(message) : null;

  let finalOutput = '';
  let node = '';

  if (forcedExactWord) {
    finalOutput = forcedExactWord;
    node = 'direct-agent';
  } else if (mode === 'direct') {
    finalOutput = await generateDirectReply({
      message,
      memorySummary,
    });
    node = 'direct-agent';
  } else {
    finalOutput = await generateMultiStepReply({
      message,
      memorySummary,
      input: normalized,
    });
    node = 'planner-agent';
  }

  return {
    ok: true,
    mode,
    node,
    input: run.input,               // IMPORTANT: preserve exact raw payload as stored
    normalizedInput: normalized,    // Optional debug field
    memoryRunCount: relevantMemory.length,
    memorySummary,
    finalOutput,
    steps:
      mode === 'direct'
        ? [
            {
              node,
              output: finalOutput,
            },
          ]
        : [
            {
              node: 'memory',
              output: memorySummary,
            },
            {
              node,
              output: finalOutput,
            },
          ],
  };
}

async function processSingleRun(run: RunRecord) {
  await markRunStarted(run.id);

  try {
    const result = await processRunV4(run);
    await markRunCompleted(run.id, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markRunFailed(run.id, message);
  }
}

async function loop() {
  console.log('[executor] V4 executor started');

  while (true) {
    try {
      const run = await getQueuedRun();

      if (run) {
        await processSingleRun(run);
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
