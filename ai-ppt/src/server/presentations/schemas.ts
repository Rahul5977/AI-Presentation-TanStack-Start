import { z } from 'zod'

import { languageOptions } from '@/lib/presentation-options'

export const presentationInputSchema = z.object({
  prompt: z.string().trim().min(8),
  audience: z.enum([
    'STUDENTS',
    'PROFESSIONALS',
    'INVESTORS',
    'GENERAL',
    'CUSTOM',
  ]),
  audienceCustom: z.string().trim().max(120).optional(),
  tone: z.enum([
    'FORMAL',
    'CASUAL',
    'PERSUASIVE',
    'EDUCATIONAL',
    'INSPIRATIONAL',
  ]),
  lengthPreset: z.enum(['SHORT', 'MEDIUM', 'LONG', 'CUSTOM']),
  customSlideCount: z.number().int().min(1).max(60).optional(),
  language: z.enum(languageOptions),
  template: z.enum([
    'MINIMAL_MONO',
    'BOLD_GRADIENT',
    'EDITORIAL_SERIF',
    'TECH_DARK',
  ]),
  imageStyle: z.enum(['REALISTIC', 'ILLUSTRATION', 'MINIMAL', 'THREE_D', 'NONE']),
  depth: z.enum(['HIGH_LEVEL', 'BALANCED', 'DETAILED']),
})

export const outlineSlideSchema = z.object({
  title: z.string().trim().min(1),
  intent: z.string().trim().min(1),
  bullets: z.array(z.string().trim().min(1)).min(2).max(6),
  visualConcept: z.string().trim().min(1),
  speakerNotesHint: z.string().trim().optional(),
})

export const outlineGenerationSchema = z.object({
  title: z.string().trim().min(1),
  slides: z.array(outlineSlideSchema).min(3).max(25),
})

export type PresentationInput = z.infer<typeof presentationInputSchema>
export type OutlineSlideInput = z.infer<typeof outlineSlideSchema>

export function normalizePresentationInput(
  raw: unknown,
): z.SafeParseReturnType<unknown, PresentationInput> {
  const candidate =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {}

  if (candidate.lengthPreset !== 'CUSTOM') {
    delete candidate.customSlideCount
  }
  if (candidate.audience !== 'CUSTOM') {
    delete candidate.audienceCustom
  }

  return presentationInputSchema.safeParse(candidate)
}

export function resolveSlideCount(input: PresentationInput): number {
  if (input.lengthPreset === 'CUSTOM' && input.customSlideCount) {
    return input.customSlideCount
  }

  switch (input.lengthPreset) {
    case 'SHORT':
      return 6
    case 'LONG':
      return 16
    case 'MEDIUM':
    default:
      return 10
  }
}
