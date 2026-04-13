/*
 * EvoFlow AI Ops - Memory V4 patch
 * Drop-in replacement candidate for: workers/executor/src/lib/memory.ts
 *
 * Goal:
 * - avoid irrelevant matches like cats/birthday
 * - still catch related follow-ups like email validator improvements
 */

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type RunRecord = {
  id: string;
  status: string;
  input: JsonValue;
  output?: JsonValue | null;
};

export type MemoryMatch = {
  runId: string;
  score: number;
  message: string;
  outputText: string;
};

type SteeringRules = {
  focus?: string[];
  exclude?: string[];
  instructions?: string;
};

type MemoryOptions = {
  maxItems?: number;
  minScore?: number;
  steeringRules?: SteeringRules;
};

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','to','of','in','on','for','with','from','by','at',
  'is','are','was','were','be','been','being','this','that','these','those','it','its',
  'i','you','we','they','he','she','them','our','your','my','me','us',
  'bara','med','och','det','den','att','som','på','för','till','är','var','ska','kan',
  'write','make','create','improve','explain','simple','simply','please','more','previous'
]);

function safeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getRunMessage(run: RunRecord): string {
  if (!run.input || typeof run.input !== 'object' || Array.isArray(run.input)) return '';
  const raw = run.input as Record<string, JsonValue>;
  return typeof raw.message === 'string' ? raw.message : '';
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9åäö_\-\s]/gi, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length > 2)
    .filter((t) => !STOP_WORDS.has(t));
}

function toKeywordSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) {
    if (b.has(token)) shared++;
  }
  const maxSize = Math.max(a.size, b.size);
  return shared / maxSize;
}

function phraseBoost(current: string, previous: string): number {
  const c = current.toLowerCase();
  const p = previous.toLowerCase();
  let boost = 0;

  const relatedPairs = [
    ['email', 'validator'],
    ['validator', 'email'],
    ['typescript', 'function'],
    ['improve', 'previous'],
    ['previous', 'validator'],
    ['robust', 'validator'],
  ];

  for (const [a, b] of relatedPairs) {
    if (c.includes(a) && p.includes(b)) boost += 0.08;
    if (c.includes(b) && p.includes(a)) boost += 0.08;
  }

  if (c.includes('previous') || c.includes('earlier')) {
    boost += 0.08;
  }

  return boost;
}

function recencyBoost(index: number): number {
  if (index === 0) return 0.12;
  if (index === 1) return 0.08;
  if (index === 2) return 0.04;
  return 0;
}

export function getRelevantMemory(
  currentMessage: string,
  previousRuns: RunRecord[],
  options: MemoryOptions = {}
): MemoryMatch[] {
  const maxItems = options.maxItems ?? 5;
  const minScore = options.minScore ?? 0.18;
  const steering = options.steeringRules;

  const currentKeywords = toKeywordSet(currentMessage);

  const scored = previousRuns
    .map((run, index) => {
      const previousMessage = getRunMessage(run);
      const previousOutput = safeString(run.output);
      const previousText = `${previousMessage} ${previousOutput}`.trim();
      
      const lowerText = previousText.toLowerCase();

      // 1. Steering: Exclusion
      if (steering?.exclude && steering.exclude.length > 0) {
        if (steering.exclude.some(term => lowerText.includes(term.toLowerCase()))) {
          return null; // Exclude this chunk entirely
        }
      }

      const previousKeywords = toKeywordSet(previousText);
      let score =
        overlapScore(currentKeywords, previousKeywords) +
        phraseBoost(currentMessage, previousText) +
        recencyBoost(index);

      // 2. Steering: Focus Boost
      if (steering?.focus && steering.focus.length > 0) {
        if (steering.focus.some(term => lowerText.includes(term.toLowerCase()))) {
          score += 0.25; // Significant boost for focused topics
        }
      }

      return {
        runId: run.id,
        score,
        message: previousMessage,
        outputText: previousOutput,
      };
    })
    .filter((item): item is MemoryMatch => item !== null && (!!item.message || !!item.outputText))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);

  return scored;
}

export function buildMemorySummary(matches: MemoryMatch[]): string {
  if (!matches.length) return '';

  return matches
    .map((m, index) => {
      const trimmedMessage = m.message.length > 180 ? `${m.message.slice(0, 180)}...` : m.message;
      const trimmedOutput = m.outputText.length > 220 ? `${m.outputText.slice(0, 220)}...` : m.outputText;

      return [
        `Memory ${index + 1}:`,
        `Previous task: ${trimmedMessage || '(no message)'}`,
        `Previous result: ${trimmedOutput || '(no output)'}`,
      ].join(' ');
    })
    .join('\n');
}
