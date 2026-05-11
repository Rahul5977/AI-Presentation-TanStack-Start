import OpenAI from 'openai'

let openAIClient: OpenAI | null = null

function getOpenAIClient() {
  if (openAIClient) return openAIClient

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is missing.')
  openAIClient = new OpenAI({ apiKey })
  return openAIClient
}

export async function generateSlideContent(input: {
  prompt: string
  language: string
  tone: string
  depth: string
  title: string
  intent: string
  bullets: string[]
  visualConcept: string
}) {
  const client = getOpenAIClient()
  const response = await client.responses.create({
    model: process.env.OPENAI_SLIDE_MODEL ?? 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: `Return strict JSON with:
- title
- intent
- bullets (3-6 concise strings)
- speakerNotes
- layoutHints (object with type + emphasis)
- imagePrompt
Keep language, tone and depth aligned to user settings.`,
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
  })

  if (!response.output_text) throw new Error('OpenAI returned empty slide content.')
  return JSON.parse(response.output_text) as {
    title: string
    intent: string
    bullets: string[]
    speakerNotes: string
    layoutHints: Record<string, unknown>
    imagePrompt: string
  }
}

export async function generateSlideImageBase64(input: {
  visualConcept: string
  imageStyle: string
  imagePrompt?: string
}) {
  const client = getOpenAIClient()
  const prompt = `${input.imagePrompt ?? input.visualConcept}. Image style: ${input.imageStyle}.`
  const imageModel = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1'
  const quality = process.env.OPENAI_IMAGE_QUALITY ?? 'low'
  const size = process.env.OPENAI_IMAGE_SIZE ?? '1536x1024'

  const response = await client.images.generate({
    model: imageModel,
    prompt,
    quality,
    size,
  })

  const base64 = response.data?.[0]?.b64_json
  if (!base64) {
    throw new Error('OpenAI did not return image data.')
  }
  return base64
}
