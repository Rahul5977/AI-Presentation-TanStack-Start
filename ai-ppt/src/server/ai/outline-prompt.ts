import type { PresentationInput } from '@/server/presentations/schemas'

const audienceGuidance: Record<PresentationInput['audience'], string> = {
  STUDENTS: 'Explain concepts from first principles; define jargon; use relatable examples.',
  PROFESSIONALS: 'Be efficient and outcome-oriented; assume domain literacy; emphasize implications.',
  INVESTORS: 'Lead with the opportunity, market, traction, and numbers; be persuasive and credible.',
  GENERAL: 'Keep it accessible and engaging for a broad audience; avoid niche jargon.',
  CUSTOM: 'Tailor the framing precisely to the described audience.',
}

const toneGuidance: Record<PresentationInput['tone'], string> = {
  FORMAL: 'measured, precise, and professional',
  CASUAL: 'warm, conversational, and approachable',
  PERSUASIVE: 'confident and compelling, building toward a clear call to action',
  EDUCATIONAL: 'clear and instructive, prioritizing understanding',
  INSPIRATIONAL: 'energizing and vision-led, with momentum',
}

const depthGuidance: Record<PresentationInput['depth'], string> = {
  HIGH_LEVEL: 'Stay at the strategic level: big ideas, few details.',
  BALANCED: 'Balance key ideas with enough supporting detail to be credible.',
  DETAILED: 'Go deep: include specifics, mechanisms, and supporting evidence.',
}

/**
 * Shared, high-quality system instruction for outline generation, used by both
 * the Gemini and OpenAI providers so deck quality is identical regardless of
 * which model is configured.
 */
export function buildOutlineSystemInstruction(
  input: PresentationInput,
  targetSlides: number,
): string {
  const audience =
    input.audience === 'CUSTOM' && input.audienceCustom
      ? `${input.audienceCustom} (custom)`
      : input.audience

  return `You are a world-class presentation strategist and storyteller.
Design a tight, compelling outline of exactly ${targetSlides} slides that flows as a narrative
(hook → context → core ideas → evidence → takeaway/call-to-action), not a list of disconnected facts.

Audience: ${audience}. ${audienceGuidance[input.audience]}
Tone: be ${toneGuidance[input.tone]}.
Depth: ${depthGuidance[input.depth]}
Language: write ALL slide content — titles, bullets, notes — in ${input.language}.

Rules for quality:
- The first slide is the title/cover; the last is a closing or call-to-action.
- Every slide earns its place — no filler, no repetition across slides.
- Titles are specific and benefit-driven, never generic ("Introduction", "Conclusion" are banned).
- Bullets are parallel, scannable, and concrete; prefer specifics over vague claims.
- "intent" states the single job of the slide in one sentence.
- "visualConcept" describes a striking, relevant image (subject, style, mood) — not text.
- "speakerNotesHint" gives the presenter a natural talking point, not a restatement of bullets.

Return strict JSON only — no markdown, no commentary.`
}
