import { GoogleGenAI, Type } from '@google/genai'
import { ModelOutputError } from '@/server/ai/runtime'
import type { TokenUsage } from '@/server/ai/runtime'
import { outlineGenerationSchema, resolveSlideCount } from '@/server/presentations/schemas'
import { VISUALIZE_SYSTEM_INSTRUCTION } from '@/server/ai/visualize-prompt'
import { buildOutlineSystemInstruction } from '@/server/ai/outline-prompt'
import { buildTextActionSystemInstruction } from '@/server/ai/text-action-prompt'
import type { SlideVisualInput } from '@/server/ai/visualize-prompt'
import type { TextActionInput } from '@/server/ai/text-action-prompt'
import type { OutlineGeneration, PresentationInput } from '@/server/presentations/schemas'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (client) return client
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing.')
  client = new GoogleGenAI({ apiKey })
  return client
}

const textModel = () => process.env.GEMINI_MODEL ?? 'gemini-2.5-pro'

export type OutlineValue = OutlineGeneration

export async function generateOutlineWithGemini(
  input: PresentationInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<{ value: OutlineValue; usage: TokenUsage }> {
  const ai = getClient()
  const targetSlides = resolveSlideCount(input)

  const systemInstruction = buildOutlineSystemInstruction(input, targetSlides)

  const response = await ai.models.generateContent({
    model: opts.model ?? textModel(),
    contents: JSON.stringify({ ...input, targetSlides }),
    config: {
      systemInstruction,
      abortSignal: opts.signal,
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
  if (!parsed.success) throw new ModelOutputError('Gemini returned invalid outline structure.')

  return {
    value: parsed.data,
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    },
  }
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

export type SlideAssistantResult = {
  summary: string
  title: string
  intent: string
  bullets: string[]
  speakerNotes: string
}

export async function improveSlideWithGemini(
  input: SlideAssistantInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<{ value: SlideAssistantResult; usage: TokenUsage }> {
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
    model: opts.model ?? textModel(),
    contents: JSON.stringify(input),
    config: {
      systemInstruction,
      abortSignal: opts.signal,
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

  const parsed = JSON.parse(text) as SlideAssistantResult

  if (
    !parsed.summary ||
    !parsed.title ||
    !parsed.intent ||
    !Array.isArray(parsed.bullets) ||
    parsed.bullets.length < 2
  ) {
    throw new ModelOutputError('Gemini returned invalid slide assistant output.')
  }

  return {
    value: parsed,
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    },
  }
}

export async function generateSlideVisualWithGemini(
  input: SlideVisualInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<{ value: unknown; usage: TokenUsage }> {
  const ai = getClient()
  const response = await ai.models.generateContent({
    model: opts.model ?? textModel(),
    contents: JSON.stringify(input),
    config: {
      systemInstruction: VISUALIZE_SYSTEM_INSTRUCTION,
      abortSignal: opts.signal,
      responseMimeType: 'application/json',
    },
  })
  const text = response.text
  if (!text) throw new Error('Gemini returned empty visual.')
  return {
    value: JSON.parse(text),
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    },
  }
}

export async function applyTextActionWithGemini(
  input: TextActionInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<{ value: string[]; usage: TokenUsage }> {
  const ai = getClient()
  const response = await ai.models.generateContent({
    model: opts.model ?? textModel(),
    contents: JSON.stringify({ bullets: input.bullets, context: input.context }),
    config: {
      systemInstruction: buildTextActionSystemInstruction(input.action),
      abortSignal: opts.signal,
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
  return {
    value: normalizeBullets(parsed.bullets),
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    },
  }
}

function normalizeBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((b): b is string => typeof b === 'string')
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .slice(0, 8)
}
