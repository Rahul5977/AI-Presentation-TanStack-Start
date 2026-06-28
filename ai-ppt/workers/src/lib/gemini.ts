import { GoogleGenAI, Type } from '@google/genai'

import type { TokenUsage } from '../../../src/server/ai/runtime/pricing'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (client) return client
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing.')
  client = new GoogleGenAI({ apiKey })
  return client
}

const textModel = () => process.env.GEMINI_MODEL ?? 'gemini-2.5-pro'
const imageModel = () => process.env.IMAGEN_MODEL ?? 'imagen-4.0-generate-001'

const IMAGE_STYLE_PROMPTS: Record<string, string> = {
  REALISTIC: 'photorealistic, high detail, professional photography, 4K',
  ILLUSTRATION: 'digital illustration, clean vector art, modern flat design, vibrant colors',
  MINIMAL: 'minimalist, clean lines, simple shapes, limited color palette, white background',
  THREE_D: '3D render, octane render, soft lighting, detailed textures, isometric',
}

// ── Slide content generation ─────────────────────────────────────────────────

export type SlideContentValue = {
  title: string
  intent: string
  bullets: string[]
  speakerNotes: string
  layoutHints: Record<string, unknown>
  imagePrompt: string
}

export async function generateSlideContent(
  input: {
    prompt: string
    language: string
    tone: string
    depth: string
    title: string
    intent: string
    bullets: string[]
    visualConcept: string
  },
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<{ value: SlideContentValue; usage: TokenUsage }> {
  const ai = getClient()

  const systemInstruction = `You are an expert presentation writer polishing a single slide.
Refine the provided draft into its strongest final form. Keep it on-topic for the slide's
title and intent; do not drift to a different subject.

Return strict JSON with exactly these fields:
- title: a sharp, specific title (no generic words like "Introduction"/"Overview")
- intent: one-sentence takeaway — the single point the audience should remember
- bullets: 3-6 parallel, concrete bullets. Prefer specifics (numbers, examples, outcomes)
  over vague claims. Each bullet is one scannable line, not a paragraph.
- speakerNotes: 2-4 sentences giving the presenter a natural talking track that ADDS
  context beyond the bullets (a why, an example, a transition) — never just restate them.
- layoutHints: object with layoutType (one of: title|content|twoColumn|imageLeft|quote|stats|sectionDivider|closing)
  chosen to fit the content (use "stats" for data-heavy slides, "quote" for a memorable line,
  "sectionDivider" for transitions) and emphasis (primary|secondary|balanced)
- imagePrompt: a vivid, specific image prompt matching the visual concept (subject, style, mood; no text)

Write ALL output text in ${input.language}. Tone: ${input.tone}. Depth: ${input.depth}.`

  const response = await ai.models.generateContent({
    model: opts.model ?? textModel(),
    contents: JSON.stringify(input),
    config: {
      systemInstruction,
      abortSignal: opts.signal,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          intent: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
          speakerNotes: { type: Type.STRING },
          layoutHints: {
            type: Type.OBJECT,
            properties: {
              layoutType: { type: Type.STRING },
              emphasis: { type: Type.STRING },
            },
            required: ['layoutType', 'emphasis'],
          },
          imagePrompt: { type: Type.STRING },
        },
        required: ['title', 'intent', 'bullets', 'speakerNotes', 'layoutHints', 'imagePrompt'],
      },
    },
  })

  const text = response.text
  if (!text) throw new Error('Gemini returned empty slide content.')

  const value = JSON.parse(text) as SlideContentValue
  return {
    value,
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    },
  }
}

// ── Image generation (Imagen) ────────────────────────────────────────────────

export async function generateSlideImageBase64(
  input: {
    visualConcept: string
    imageStyle: string
    imagePrompt?: string
  },
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<{ value: string; usage: TokenUsage }> {
  const ai = getClient()

  const styleModifier = IMAGE_STYLE_PROMPTS[input.imageStyle] ?? IMAGE_STYLE_PROMPTS.ILLUSTRATION
  const basePrompt = input.imagePrompt ?? input.visualConcept
  const fullPrompt = `${basePrompt}. Style: ${styleModifier}. Suitable for a professional presentation slide. No text overlays.`

  const response = await ai.models.generateImages({
    model: opts.model ?? imageModel(),
    prompt: fullPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio: '16:9',
      abortSignal: opts.signal,
    },
  })

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes
  if (!imageBytes) throw new Error('Imagen returned no image data.')

  return { value: imageBytes, usage: { images: 1 } }
}
