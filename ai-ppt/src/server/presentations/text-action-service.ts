import { prisma } from '@/lib/db'
import { applyTextActionWithGemini } from '@/server/ai/gemini'
import { applyTextActionWithOpenAI } from '@/server/ai/openai'
import type { TextTransformAction } from '@/generated/prisma/client'

function resolveProvider(): 'gemini' | 'openai' {
  const raw =
    process.env.OUTLINE_PROVIDER ??
    process.env.TEXT_PROVIDER ??
    process.env.AI_PROVIDER ??
    'openai'
  return raw.toLowerCase() === 'openai' ? 'openai' : 'gemini'
}

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
  const run = resolveProvider() === 'openai' ? applyTextActionWithOpenAI : applyTextActionWithGemini

  let next: string[]
  try {
    next = await run({ action, bullets, context })
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
