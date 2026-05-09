import OpenAI from 'openai'

import {
  outlineGenerationSchema,
  resolveSlideCount,
} from '@/server/presentations/schemas'
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
): Promise<OutlineGenerationResult> {
  const client = getOpenAIClient()
  const targetSlides = resolveSlideCount(input)

  const response = await client.responses.create({
    model: getOutlineModel(),
    input: [
      {
        role: 'system',
        content: `You generate presentation outlines. Return strict JSON only. Do not include markdown.
The JSON must have:
- title: short presentation title
- slides: array of ${targetSlides} slide objects
Each slide must include:
- title
- intent
- bullets (2-6 concise strings)
- visualConcept
- speakerNotesHint (optional short string)`,
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
                required: ['title', 'intent', 'bullets', 'visualConcept'],
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
                  speakerNotesHint: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })

  const content = response.output_text
  if (!content) {
    throw new Error('OpenAI returned empty outline content.')
  }

  const parsed = outlineGenerationSchema.safeParse(JSON.parse(content))
  if (!parsed.success) {
    throw new Error('OpenAI returned invalid outline structure.')
  }

  return parsed.data
}
