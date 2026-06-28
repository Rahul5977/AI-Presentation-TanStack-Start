import { prisma } from '@/lib/db'
import { callModel, getFallbackChain } from '@/server/ai/runtime'
import { applyTextActionWithGemini } from '@/server/ai/gemini'
import { applyTextActionWithOpenAI } from '@/server/ai/openai'
import { getUserEntitlements, planTier } from '@/server/billing/entitlements'
import type { TextTransformAction } from '@/generated/prisma/client'

export type TextActionResult =
  | { ok: true; bullets: string[] }
  | { ok: false; error: string }

/**
 * Apply a one-click text transform (shorten / formalize / add statistic) to a
 * slide's bullets using AI, persist the result, and return the new bullets.
 */
export async function applySlideTextAction(
  presentationId: string,
  slideId: string,
  action: TextTransformAction,
  userId?: string,
): Promise<TextActionResult> {
  const slide = await prisma.slide.findFirst({
    where: { id: slideId, presentationId },
    select: { title: true, intent: true, bullets: true },
  })
  if (!slide) return { ok: false, error: 'Slide not found' }

  const bullets = Array.isArray(slide.bullets)
    ? (slide.bullets as unknown[]).filter((b): b is string => typeof b === 'string')
    : []
  if (bullets.length === 0) {
    return { ok: false, error: 'This slide has no bullets to transform.' }
  }

  const context = `Slide title: ${slide.title}. Purpose: ${slide.intent}`
  const actionInput = { action, bullets, context }
  const tier = userId ? planTier((await getUserEntitlements(userId)).plan) : 'pro'

  let next: string[]
  try {
    const generation = await callModel<string[]>({
      op: 'textAction',
      kind: 'text',
      chain: getFallbackChain('textAction', tier),
      userId,
      cacheInput: actionInput,
      run: async ({ provider, model, signal }) =>
        provider === 'openai'
          ? await applyTextActionWithOpenAI(actionInput, { model, signal })
          : await applyTextActionWithGemini(actionInput, { model, signal }),
    })
    next = generation.value
  } catch {
    return { ok: false, error: 'AI text action failed. Please try again.' }
  }

  if (next.length === 0) {
    return { ok: false, error: 'AI returned no usable text. Please try again.' }
  }

  await prisma.slide.update({
    where: { id: slideId },
    data: { bullets: next, updatedAt: new Date() },
  })

  return { ok: true, bullets: next }
}
