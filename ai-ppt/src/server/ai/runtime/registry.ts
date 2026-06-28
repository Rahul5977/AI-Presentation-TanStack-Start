/**
 * W1 — provider registry + fallback chains.
 *
 * Replaces the three near-identical `resolveProvider()` switches (outline /
 * content / image) with one place that resolves an ORDERED chain of
 * {provider, model} attempts per operation. callModel walks the chain: on a
 * retryable failure (or an open breaker) it falls through to the next entry.
 *
 * The primary provider preserves the existing env precedence and defaults, so
 * behaviour is unchanged when everything is healthy — we only ADD a fallback.
 */

export type TextProvider = 'openai' | 'gemini'
export type ImageProvider = 'openai' | 'imagen'
export type AiOp = 'outline' | 'content' | 'visualize' | 'textAction' | 'slideChat' | 'image'
/** Plan tier — controls which text model is used (free = cheaper/faster). */
export type ModelTier = 'free' | 'pro'

export type ProviderAttempt = { provider: string; model: string }

export function textModel(provider: TextProvider, tier: ModelTier = 'pro'): string {
  if (provider === 'openai') {
    if (tier === 'free') return process.env.OPENAI_FREE_MODEL ?? 'gpt-4o-mini'
    return process.env.OPENAI_TEXT_MODEL ?? process.env.OPENAI_SLIDE_MODEL ?? 'gpt-4.1-mini'
  }
  if (tier === 'free') return process.env.GEMINI_FREE_MODEL ?? 'gemini-2.5-flash'
  return process.env.GEMINI_MODEL ?? 'gemini-2.5-pro'
}

export function imageModel(provider: ImageProvider): string {
  if (provider === 'openai') {
    return process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1'
  }
  return process.env.IMAGEN_MODEL ?? 'imagen-4.0-generate-001'
}

function fallbackEnabled(): boolean {
  return process.env.AI_FALLBACK_ENABLED !== 'false'
}

/** First defined env var (in precedence order) resolved to a text provider. */
function resolveTextProvider(envNames: string[], fallback: TextProvider): TextProvider {
  for (const name of envNames) {
    const raw = process.env[name]
    if (raw && raw.trim() !== '') {
      return raw.trim().toLowerCase() === 'openai' ? 'openai' : 'gemini'
    }
  }
  return fallback
}

function resolveImageProvider(envNames: string[], fallback: ImageProvider): ImageProvider {
  for (const name of envNames) {
    const raw = process.env[name]
    if (raw && raw.trim() !== '') {
      return raw.trim().toLowerCase() === 'openai' ? 'openai' : 'imagen'
    }
  }
  return fallback
}

function textChain(primary: TextProvider, tier: ModelTier): ProviderAttempt[] {
  const secondary: TextProvider = primary === 'openai' ? 'gemini' : 'openai'
  const chain: ProviderAttempt[] = [{ provider: primary, model: textModel(primary, tier) }]
  if (fallbackEnabled()) chain.push({ provider: secondary, model: textModel(secondary, tier) })
  return chain
}

function imageChain(primary: ImageProvider): ProviderAttempt[] {
  const secondary: ImageProvider = primary === 'openai' ? 'imagen' : 'openai'
  const chain: ProviderAttempt[] = [{ provider: primary, model: imageModel(primary) }]
  if (fallbackEnabled()) chain.push({ provider: secondary, model: imageModel(secondary) })
  return chain
}

/** Resolve the ordered provider/model attempt chain for an operation. `tier`
 *  selects the text model (free = cheaper/faster); ignored for image ops. */
export function getFallbackChain(op: AiOp, tier: ModelTier = 'pro'): ProviderAttempt[] {
  switch (op) {
    case 'outline':
      return textChain(resolveTextProvider(['OUTLINE_PROVIDER', 'TEXT_PROVIDER', 'AI_PROVIDER'], 'openai'), tier)
    case 'content':
      return textChain(resolveTextProvider(['CONTENT_PROVIDER', 'TEXT_PROVIDER', 'AI_PROVIDER'], 'gemini'), tier)
    case 'visualize':
    case 'textAction':
      return textChain(resolveTextProvider(['OUTLINE_PROVIDER', 'TEXT_PROVIDER', 'AI_PROVIDER'], 'openai'), tier)
    case 'slideChat':
      // Previously hardcoded to Gemini; now gets an OpenAI fallback.
      return textChain(resolveTextProvider(['SLIDE_CHAT_PROVIDER', 'TEXT_PROVIDER', 'AI_PROVIDER'], 'gemini'), tier)
    case 'image':
      return imageChain(resolveImageProvider(['IMAGE_PROVIDER', 'AI_PROVIDER'], 'imagen'))
  }
}
