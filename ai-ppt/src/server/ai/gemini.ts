import { GoogleGenAI, Type } from '@google/genai'
import { outlineGenerationSchema, resolveSlideCount } from '@/server/presentations/schemas'
import { VISUALIZE_SYSTEM_INSTRUCTION } from '@/server/ai/visualize-prompt'
import { buildOutlineSystemInstruction } from '@/server/ai/outline-prompt'
import { buildTextActionSystemInstruction } from '@/server/ai/text-action-prompt'
import type { SlideVisualInput } from '@/server/ai/visualize-prompt'
import type { TextActionInput } from '@/server/ai/text-action-prompt'
import type { PresentationInput } from '@/server/presentations/schemas'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (client) return client
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing.')
  client = new GoogleGenAI({ apiKey })
  return client
}

const textModel = () => process.env.GEMINI_MODEL ?? 'gemini-2.5-pro'

export async function generateOutlineWithGemini(
  input: PresentationInput,
): Promise<{ title: string; slides: typeof outlineGenerationSchema._type['slides'] }> {
  const ai = getClient()
  const targetSlides = resolveSlideCount(input)

  const systemInstruction = buildOutlineSystemInstruction(input, targetSlides)

  const response = await ai.models.generateContent({
    model: textModel(),
    contents: JSON.stringify({ ...input, targetSlides }),
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                intent: { type: Type.STRING },
                bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                visualConcept: { type: Type.STRING },
                speakerNotesHint: { type: Type.STRING },
              },
              required: ['title', 'intent', 'bullets', 'visualConcept'],
            },
          },
        },
        required: ['title', 'slides'],
      },
    },
  })

  const text = response.text
  if (!text) throw new Error('Gemini returned empty outline.')

  const parsed = outlineGenerationSchema.safeParse(JSON.parse(text))
  if (!parsed.success) throw new Error('Gemini returned invalid outline structure.')

  return parsed.data
}

export type SlideAssistantInput = {
  instruction: string
  slide: {
    title: string
    intent: string
    bullets: string[]
    speakerNotes?: string | null
    visualConcept?: string
  }
  presentationTone?: string
  presentationDepth?: string
  language?: string
}

export async function improveSlideWithGemini(input: SlideAssistantInput) {
  const ai = getClient()
  const systemInstruction = `You are an expert presentation editor.
Revise one slide according to the user instruction.
Return strict JSON only with:
- summary: one short sentence describing what changed
- title
- intent
- bullets (2-8 items)
- speakerNotes
Do not include markdown.`

  const response = await ai.models.generateContent({
    model: textModel(),
    contents: JSON.stringify(input),
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          title: { type: Type.STRING },
          intent: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
          speakerNotes: { type: Type.STRING },
        },
        required: ['summary', 'title', 'intent', 'bullets', 'speakerNotes'],
      },
    },
  })

  const text = response.text
  if (!text) throw new Error('Gemini returned empty slide assistant result.')

  const parsed = JSON.parse(text) as {
    summary: string
    title: string
    intent: string
    bullets: string[]
    speakerNotes: string
  }

  if (
    !parsed.summary ||
    !parsed.title ||
    !parsed.intent ||
    !Array.isArray(parsed.bullets) ||
    parsed.bullets.length < 2
  ) {
    throw new Error('Gemini returned invalid slide assistant output.')
  }

  return parsed
}

export async function generateSlideVisualWithGemini(
  input: SlideVisualInput,
): Promise<unknown> {
  const ai = getClient()
  const response = await ai.models.generateContent({
    model: textModel(),
    contents: JSON.stringify(input),
    config: {
      systemInstruction: VISUALIZE_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
    },
  })
  const text = response.text
  if (!text) throw new Error('Gemini returned empty visual.')
  return JSON.parse(text)
}

export async function applyTextActionWithGemini(
  input: TextActionInput,
): Promise<string[]> {
  const ai = getClient()
  const response = await ai.models.generateContent({
    model: textModel(),
    contents: JSON.stringify({ bullets: input.bullets, context: input.context }),
    config: {
      systemInstruction: buildTextActionSystemInstruction(input.action),
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['bullets'],
      },
    },
  })
  const text = response.text
  if (!text) throw new Error('Gemini returned empty text action result.')
  const parsed = JSON.parse(text) as { bullets?: unknown }
  return normalizeBullets(parsed.bullets)
}

function normalizeBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((b): b is string => typeof b === 'string')
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .slice(0, 8)
}
