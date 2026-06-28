import { callModel, getFallbackChain } from '@/server/ai/runtime'
import type { ModelTier } from '@/server/ai/runtime'
import { generateOutlineWithGemini } from '@/server/ai/gemini'
import { generateOutlineWithOpenAI } from '@/server/ai/openai'
import type { OutlineGeneration, PresentationInput } from '@/server/presentations/schemas'

export type GeneratedOutline = OutlineGeneration

/**
 * Generate a presentation outline through the AI orchestration runtime (model
 * fallback, timeout, circuit breaker, concurrency cap, budget, response cache).
 * DB-free, so it is safe to import in both the web app and the worker process.
 */
export async function runOutlineModel(
  input: PresentationInput,
  opts: { userId?: string; tier?: ModelTier } = {},
) {
  return await callModel<GeneratedOutline>({
    op: 'outline',
    kind: 'text',
    chain: getFallbackChain('outline', opts.tier ?? 'pro'),
    userId: opts.userId,
    cacheInput: input,
    run: async ({ provider, model, signal }) => {
      const result =
        provider === 'openai'
          ? await generateOutlineWithOpenAI(input, { model, signal })
          : await generateOutlineWithGemini(input, { model, signal })
      return { value: result.value as GeneratedOutline, usage: result.usage }
    },
  })
}
