import type { TextTransformAction } from '@/generated/prisma/client'

export const TEXT_ACTIONS = [
  'MAKE_SHORTER',
  'MORE_FORMAL',
  'ADD_STATISTIC',
] as const satisfies ReadonlyArray<TextTransformAction>

const actionInstruction: Record<TextTransformAction, string> = {
  MAKE_SHORTER:
    'Rewrite each bullet to be noticeably more concise and punchy without losing the core meaning. Keep the same number of bullets.',
  MORE_FORMAL:
    'Rewrite each bullet in a more formal, professional, business-appropriate tone. Keep the same number of bullets.',
  ADD_STATISTIC:
    'Enrich the bullets by weaving in a plausible, realistic supporting statistic or data point where it strengthens the message. You may keep the count the same or add at most one bullet.',
}

export type TextActionInput = {
  action: TextTransformAction
  bullets: string[]
  context?: string
}

export function buildTextActionSystemInstruction(action: TextTransformAction): string {
  return `You are an expert presentation copy editor.
${actionInstruction[action]}
Return strict JSON only — no markdown — of shape: { "bullets": string[] }.
Each bullet must be a single concise line. Never return an empty array.`
}
