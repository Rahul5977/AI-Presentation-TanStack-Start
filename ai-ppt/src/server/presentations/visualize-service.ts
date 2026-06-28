import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'
import { generateSlideVisualWithGemini } from '@/server/ai/gemini'
import { generateSlideVisualWithOpenAI } from '@/server/ai/openai'
import { coerceSlideData, slideDataSchema } from '@/lib/slide-data'
import type { SlideData, SlideDataKind } from '@/lib/slide-data'
import type { SlideVisualInput } from '@/server/ai/visualize-prompt'

function resolveProvider(): 'gemini' | 'openai' {
  const raw =
    process.env.OUTLINE_PROVIDER ??
    process.env.TEXT_PROVIDER ??
    process.env.AI_PROVIDER ??
    'openai'
  return raw.toLowerCase() === 'openai' ? 'openai' : 'gemini'
}

async function generateVisual(input: SlideVisualInput): Promise<unknown> {
  return resolveProvider() === 'openai'
    ? await generateSlideVisualWithOpenAI(input)
    : await generateSlideVisualWithGemini(input)
}

export type VisualizeResult =
  | { ok: true; slideData: SlideData }
  | { ok: false; error: string }

/**
 * Generate structured data for a slide with AI and persist it. `kind` may be a
 * specific type or 'auto' to let the model choose. The model's loosely-typed
 * JSON is run through a tolerant coercer before strict validation.
 */
export async function visualizeSlide(
  presentationId: string,
  slideId: string,
  kind: SlideDataKind | 'auto',
): Promise<VisualizeResult> {
  const slide = await prisma.slide.findFirst({
    where: { id: slideId, presentationId },
    select: { title: true, intent: true, bullets: true },
  })
  if (!slide) return { ok: false, error: 'Slide not found' }

  const bullets = Array.isArray(slide.bullets)
    ? (slide.bullets as unknown[]).filter((b): b is string => typeof b === 'string')
    : []

  let raw: unknown
  try {
    raw = await generateVisual({
      kind,
      slide: { title: slide.title, intent: slide.intent, bullets },
    })
  } catch {
    return { ok: false, error: 'AI visual generation failed. Please try again.' }
  }

  const coerced = coerceSlideData(raw)
  if (!coerced) {
    return { ok: false, error: 'AI returned data that could not be rendered. Try another type.' }
  }

  await prisma.slide.update({
    where: { id: slideId },
    data: { slideData: coerced, updatedAt: new Date() },
  })

  return { ok: true, slideData: coerced }
}

/** Persist (or clear) manually-edited slide data after validation. */
export async function setSlideData(
  presentationId: string,
  slideId: string,
  rawData: unknown,
): Promise<VisualizeResult | { ok: true; slideData: null }> {
  if (rawData === null) {
    await prisma.slide.update({
      where: { id: slideId, presentationId },
      data: { slideData: Prisma.JsonNull, updatedAt: new Date() },
    })
    return { ok: true, slideData: null }
  }

  const parsed = slideDataSchema.safeParse(rawData)
  if (!parsed.success) return { ok: false, error: 'Invalid slide data' }

  await prisma.slide.update({
    where: { id: slideId, presentationId },
    data: { slideData: parsed.data, updatedAt: new Date() },
  })
  return { ok: true, slideData: parsed.data }
}
