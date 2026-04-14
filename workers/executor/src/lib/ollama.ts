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

const OLLAMA_URL = process.env.OLLAMA_URL?.replace('/api/chat', '/api/generate') || 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const LANGUAGE_CONSISTENCY_INSTRUCTION = "IMPORTANT: Always respond in the same language as the user's latest prompt.";

async function callOllama(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, images?: string[]) {
  // If images are present, we MUST use a vision-capable model (like llava)
  const isVision = images && images.length > 0;
  const activeModel = isVision ? 'llava' : OLLAMA_MODEL;

  // Day 17: Build a flat prompt for /api/generate
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const userMsg = messages.find(m => m.role === 'user')?.content || '';
  
  const payload: any = {
    model: activeModel,
    stream: false,
    prompt: userMsg,
    system: systemMsg + `\n${LANGUAGE_CONSISTENCY_INSTRUCTION}`,
    options: {
      temperature: 0.2,
      num_predict: 8192, // Day 18: Maximized for local Ollama
      num_ctx: 16384,    // Expanded context window
    },
  };

  if (isVision) {
    // Process images: ensure they are RAW base64 (no data:image/png;base64, prefix)
    const cleanedImages = images.map(img => {
      if (typeof img !== 'string') return '';
      if (img.includes(';base64,')) {
        return img.split(';base64,')[1];
      }
      return img;
    }).filter(i => i.length > 0);

    if (cleanedImages.length > 0) {
      console.log(`[executor/ollama] Attaching ${cleanedImages.length} images to /api/generate payload.`);
      payload.images = cleanedImages;
    }
  }

  console.log(`[executor/ollama] Calling ${activeModel} at ${OLLAMA_URL}...`);

  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    response?: string;
  };

  return data.response?.trim() || '';
}

export async function generateDirectReply({ message, memorySummary }: DirectArgs, images?: string[]): Promise<string> {
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
  ], images);
}

export async function generateMultiStepReply({ message, memorySummary, input }: MultiStepArgs, images?: string[]): Promise<string> {
  const system = [
    'You are the multi-step agent node in EvoFlow AI Ops.',
    'Solve the task faithfully and stay on topic.',
    'Use relevant memory only if it clearly helps with the current request.',
    'Do not drift into unrelated topics.',
    images && images.length > 0 ? 'IMAGE ANALYSIS: You have access to images attached to the last user message.' : '',
    memorySummary ? `Relevant memory:\n${memorySummary}` : '',
    input ? `Original input payload:\n${JSON.stringify(input, null, 2)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return callOllama([
    { role: 'system', content: system },
    { role: 'user', content: message },
  ], images);
}
