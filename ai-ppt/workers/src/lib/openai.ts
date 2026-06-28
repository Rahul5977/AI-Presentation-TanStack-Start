import OpenAI from 'openai'

import type { TokenUsage } from '../../../src/server/ai/runtime/pricing'
import type { SlideContentValue } from './gemini'

let openAIClient: OpenAI | null = null

function getOpenAIClient() {
  if (openAIClient) return openAIClient

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is missing.')
  openAIClient = new OpenAI({ apiKey })
  return openAIClient
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
  const client = getOpenAIClient()
  const response = await client.responses.create(
    {
    model: opts.model ?? process.env.OPENAI_SLIDE_MODEL ?? 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: `You are an expert presentation writer polishing a single slide into its
strongest final form. Stay on-topic for the slide's title and intent. Return strict JSON with:
- title: sharp and specific (no generic "Introduction"/"Overview")
- intent: one-sentence key takeaway
- bullets (3-6): parallel, concrete, scannable single lines; prefer specifics over vague claims
- speakerNotes: 2-4 sentences that ADD context (a why, an example, a transition), not a restatement
- layoutHints (object with layoutType: title|content|twoColumn|imageLeft|quote|stats|sectionDivider|closing, and emphasis: primary|secondary|balanced) chosen to fit the content
- imagePrompt: a vivid, specific visual prompt (subject, style, mood; no text)
Write ALL text in the user's language; match the requested tone and depth.`,
      },
      {
        role: 'user',
        content: JSON.stringify(input),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'slide_content',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: [
            'title',
            'intent',
            'bullets',
            'speakerNotes',
            'layoutHints',
            'imagePrompt',
          ],
          properties: {
            title: { type: 'string' },
            intent: { type: 'string' },
            bullets: {
              type: 'array',
              minItems: 3,
              maxItems: 6,
              items: { type: 'string' },
            },
            speakerNotes: { type: 'string' },
            layoutHints: {
              type: 'object',
              additionalProperties: false,
              required: ['layoutType', 'emphasis'],
              properties: {
                layoutType: { type: 'string' },
                emphasis: { type: 'string' },
              },
            },
            imagePrompt: { type: 'string' },
          },
        },
      },
    },
    },
    { signal: opts.signal },
  )

  if (!response.output_text) throw new Error('OpenAI returned empty slide content.')
  const value = JSON.parse(response.output_text) as SlideContentValue
  return {
    value,
    usage: {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  }
}

export async function generateSlideImageBase64(
  input: {
    visualConcept: string
    imageStyle: string
    imagePrompt?: string
  },
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<{ value: string; usage: TokenUsage }> {
  const client = getOpenAIClient()
  const prompt = `${input.imagePrompt ?? input.visualConcept}. Image style: ${input.imageStyle}.`
  const imageModel = opts.model ?? process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1'
  const quality = (process.env.OPENAI_IMAGE_QUALITY ??
    'low') as OpenAI.Images.ImageGenerateParams['quality']
  const size = (process.env.OPENAI_IMAGE_SIZE ??
    '1536x1024') as OpenAI.Images.ImageGenerateParams['size']

  const response = await client.images.generate(
    {
      model: imageModel,
      prompt,
      quality,
      size,
    },
    { signal: opts.signal },
  )

  const base64 = response.data?.[0]?.b64_json
  if (!base64) {
    throw new Error('OpenAI did not return image data.')
  }
  return { value: base64, usage: { images: 1 } }
}
