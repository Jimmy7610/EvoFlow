import { generateWithOllama, getInstalledModels } from './lib/ollama'

/**
 * Drop-in helper for your executor.
 *
 * Usage:
 *   const result = await runWithOllama(run.input)
 *   // save result.output in your DB
 */
export async function runWithOllama(runInput: unknown) {
  const installedModels = await getInstalledModels()

  console.log(
    '[executor] Installed Ollama models:',
    installedModels.map((model) => model.name).join(', ') || '(none)'
  )

  const prompt = `
You are an autonomous AI execution agent inside EvoFlow.

Your task is to process the workflow input and return a concise, useful result.

Workflow run input:
${JSON.stringify(runInput ?? {}, null, 2)}

Return a practical response that can be stored as the run result.
`

  const aiResult = await generateWithOllama({
    system: 'You are a precise, helpful and practical AI execution agent.',
    prompt,
  })

  console.log('[executor] Using Ollama model:', aiResult.model)
  console.log('[executor] AI output:', aiResult.output)

  return aiResult
}
