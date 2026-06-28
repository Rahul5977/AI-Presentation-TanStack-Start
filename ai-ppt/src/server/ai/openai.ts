import OpenAI from 'openai'

import { ModelOutputError } from '@/server/ai/runtime'
import type { TokenUsage } from '@/server/ai/runtime'
import {
  outlineGenerationSchema,
  resolveSlideCount,
} from '@/server/presentations/schemas'
import { VISUALIZE_SYSTEM_INSTRUCTION } from '@/server/ai/visualize-prompt'
import { buildOutlineSystemInstruction } from '@/server/ai/outline-prompt'
import { buildTextActionSystemInstruction } from '@/server/ai/text-action-prompt'
import type { SlideVisualInput } from '@/server/ai/visualize-prompt'
import type { TextActionInput } from '@/server/ai/text-action-prompt'
import type {
  OutlineSlideInput,
  PresentationInput,
} from '@/server/presentations/schemas'

type OutlineGenerationResult = {
  title: string
  slides: OutlineSlideInput[]
}

let cachedClient: OpenAI | null = null

function getOpenAIClient() {
  if (cachedClient) return cachedClient

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing.')
  }

  cachedClient = new OpenAI({ apiKey })
  return cachedClient
}

function getOutlineModel() {
  return process.env.OPENAI_OUTLINE_MODEL ?? 'gpt-4.1-mini'
}

export async function generateOutlineWithOpenAI(
  input: PresentationInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<{ value: OutlineGenerationResult; usage: TokenUsage }> {
  const client = getOpenAIClient()
  const targetSlides = resolveSlideCount(input)

  const response = await client.responses.create(
    {
    model: opts.model ?? getOutlineModel(),
    input: [
      {
        role: 'system',
        content: buildOutlineSystemInstruction(input, targetSlides),
      },
      {
        role: 'user',
        content: JSON.stringify({
          ...input,
          targetSlides,
        }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'outline_generation',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'slides'],
          properties: {
            title: { type: 'string' },
            slides: {
              type: 'array',
              minItems: Math.max(3, targetSlides - 2),
              maxItems: Math.min(25, targetSlides + 2),
              items: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'title',
                  'intent',
                  'bullets',
                  'visualConcept',
                  'speakerNotesHint',
                ],
                properties: {
                  title: { type: 'string' },
                  intent: { type: 'string' },
                  bullets: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 6,
                    items: { type: 'string' },
                  },
                  visualConcept: { type: 'string' },
                  speakerNotesHint: {
                    anyOf: [{ type: 'string' }, { type: 'null' }],
                  },
                },
              },
            },
          },
        },
      },
    },
    },
    { signal: opts.signal },
  )

  const content = response.output_text
  if (!content) {
    throw new Error('OpenAI returned empty outline content.')
  }

  const parsed = outlineGenerationSchema.safeParse(JSON.parse(content))
  if (!parsed.success) {
    throw new ModelOutputError('OpenAI returned invalid outline structure.')
  }

  return {
    value: parsed.data,
    usage: {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  }
}

export async function generateSlideVisualWithOpenAI(
  input: SlideVisualInput,
): Promise<unknown> {
  const client = getOpenAIClient()

  const response = await client.responses.create({
    model: getOutlineModel(),
    input: [
      { role: 'system', content: VISUALIZE_SYSTEM_INSTRUCTION },
      { role: 'user', content: JSON.stringify(input) },
    ],
    text: { format: { type: 'json_object' } },
  })

  const content = response.output_text
  if (!content) throw new Error('OpenAI returned empty visual.')
  return JSON.parse(content)
}

export async function applyTextActionWithOpenAI(
  input: TextActionInput,
): Promise<string[]> {
  const client = getOpenAIClient()
  const response = await client.responses.create({
    model: getOutlineModel(),
    input: [
      { role: 'system', content: buildTextActionSystemInstruction(input.action) },
      {
        role: 'user',
        content: JSON.stringify({ bullets: input.bullets, context: input.context }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'text_action',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['bullets'],
          properties: {
            bullets: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  const content = response.output_text
  if (!content) throw new Error('OpenAI returned empty text action result.')
  const parsed = JSON.parse(content) as { bullets?: unknown }
  if (!Array.isArray(parsed.bullets)) return []
  return parsed.bullets
    .filter((b): b is string => typeof b === 'string')
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .slice(0, 8)
}
