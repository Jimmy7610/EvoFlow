/*
 * EvoFlow AI Ops - Ollama V4 patch
 * Drop-in replacement candidate for: workers/executor/src/lib/ollama.ts
 */

type DirectArgs = {
  message: string;
  memorySummary?: string;
};

type MultiStepArgs = {
  message: string;
  memorySummary?: string;
  input?: unknown;
};

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

async function callOllama(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages,
      options: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    message?: {
      content?: string;
    };
  };

  return data.message?.content?.trim() || '';
}

export async function generateDirectReply({ message, memorySummary }: DirectArgs): Promise<string> {
  const system = [
    'You are the direct reply node in EvoFlow AI Ops.',
    'Follow the user instruction exactly.',
    'Do not add commentary, prefaces, markdown, or explanations unless explicitly requested.',
    'If the user asks for only one word, return only that word.',
    memorySummary ? `Relevant memory:\n${memorySummary}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return callOllama([
    { role: 'system', content: system },
    { role: 'user', content: message },
  ]);
}

export async function generateMultiStepReply({ message, memorySummary, input }: MultiStepArgs): Promise<string> {
  const system = [
    'You are the multi-step agent node in EvoFlow AI Ops.',
    'Solve the task faithfully and stay on topic.',
    'Use relevant memory only if it clearly helps with the current request.',
    'Do not drift into unrelated topics.',
    memorySummary ? `Relevant memory:\n${memorySummary}` : '',
    input ? `Original input payload:\n${JSON.stringify(input, null, 2)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return callOllama([
    { role: 'system', content: system },
    { role: 'user', content: message },
  ]);
}
