/** Approximate model pricing (USD) for cost estimation and budget enforcement.
 *  These are ESTIMATES used to cap spend, not billing-accurate figures; tune as
 *  provider pricing changes. Per-million-token rates for text; per-image for
 *  image models. Unknown models cost 0 (logged once) so a missing entry never
 *  blocks generation — add the model here to enforce its spend. */

export type ModelPrice = {
  inputPerMillion?: number
  outputPerMillion?: number
  perImage?: number
}

const PRICING: Record<string, ModelPrice> = {
  'gpt-4.1-mini': { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  'gpt-4.1': { inputPerMillion: 2, outputPerMillion: 8 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 10 },
  'gemini-2.5-flash': { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  'gpt-image-1': { perImage: 0.02 },
  'imagen-4.0-generate-001': { perImage: 0.04 },
}

export type TokenUsage = {
  inputTokens?: number
  outputTokens?: number
  images?: number
}

const warned = new Set<string>()

export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const price = PRICING[model]
  if (!price) {
    if (!warned.has(model)) {
      warned.add(model)
      console.warn(
        JSON.stringify({
          level: 'warn',
          src: 'ai-runtime',
          msg: 'no pricing entry for model; cost counted as 0',
          model,
        }),
      )
    }
    return 0
  }
  let cost = 0
  if (usage.inputTokens && price.inputPerMillion) {
    cost += (usage.inputTokens / 1_000_000) * price.inputPerMillion
  }
  if (usage.outputTokens && price.outputPerMillion) {
    cost += (usage.outputTokens / 1_000_000) * price.outputPerMillion
  }
  if (usage.images && price.perImage) {
    cost += usage.images * price.perImage
  }
  return cost
}
