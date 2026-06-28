import type OpenAI from 'openai'

import { prisma } from '@/lib/db'
import { getOpenAIClient, isOpenAIConfigured } from '@/server/ai/openai'
import { assertBudgetAvailable, estimateCostUsd, recordSpend } from '@/server/ai/runtime'
import {
  deleteSlide,
  insertSlideWithContent,
  reorderSlides,
  updateSlideContent,
} from '@/server/presentations/slide-service'
import { TEMPLATE_KINDS } from '@/templates/schema'
import type { TemplateKind } from '@/templates/schema'

const MAX_STEPS = 8
const CALL_TIMEOUT_MS = 45_000

export type DeckAgentResult = { summary: string; actions: string[] }

export class AgentUnavailableError extends Error {}

function agentModel(): string {
  return process.env.OPENAI_AGENT_MODEL ?? process.env.OPENAI_TEXT_MODEL ?? 'gpt-4.1-mini'
}

async function buildOutline(presentationId: string) {
  const presentation = await prisma.presentation.findUnique({
    where: { id: presentationId },
    select: {
      template: true,
      slides: {
        orderBy: { position: 'asc' },
        select: { id: true, position: true, title: true, intent: true, bullets: true },
      },
    },
  })
  if (!presentation) return null
  return {
    template: presentation.template,
    slides: presentation.slides.map((s) => ({
      id: s.id,
      position: s.position,
      title: s.title,
      intent: s.intent,
      bulletCount: Array.isArray(s.bullets) ? s.bullets.length : 0,
    })),
  }
}

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_outline',
      description: 'Read the current deck outline (slide ids, positions, titles).',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_slide',
      description: 'Insert a new, fully-written slide after the given 0-based position.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['afterPosition', 'title', 'intent', 'bullets'],
        properties: {
          afterPosition: { type: 'integer', description: '0-based position to insert after (-1 for start).' },
          title: { type: 'string' },
          intent: { type: 'string', description: 'One-sentence takeaway.' },
          bullets: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_slide',
      description: 'Rewrite fields of an existing slide. Only include fields you want to change.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['slideId'],
        properties: {
          slideId: { type: 'string' },
          title: { type: 'string' },
          intent: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_slide',
      description: 'Delete a slide by id. Be conservative — confirm intent before deleting several.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['slideId'],
        properties: { slideId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reorder_slides',
      description: 'Set the full slide order. Provide every slide id exactly once, in the new order.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['slideIds'],
        properties: { slideIds: { type: 'array', items: { type: 'string' } } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_template',
      description: 'Restyle the whole deck by switching its template.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['template'],
        properties: { template: { type: 'string', enum: [...TEMPLATE_KINDS] } },
      },
    },
  },
]

const SYSTEM_PROMPT = `You are a presentation editing agent. You modify a slide deck on the user's
behalf using the provided tools. Reference slides by their "id" from the outline. Make the smallest
set of changes that satisfies the request, keep content on-topic and well-written, and prefer editing
over deleting. If a request would delete several slides or is ambiguous, do NOT delete — ask the user
to confirm in your final reply instead. When done, reply with a short, friendly summary of exactly
what you changed (or what you recommend if you didn't change anything).`

type ToolContext = { userId: string; presentationId: string; actions: string[] }

async function executeTool(ctx: ToolContext, name: string, args: Record<string, unknown>): Promise<string> {
  const { userId, presentationId, actions } = ctx
  switch (name) {
    case 'get_outline': {
      const outline = await buildOutline(presentationId)
      return JSON.stringify(outline ?? { slides: [] })
    }
    case 'add_slide': {
      const res = await insertSlideWithContent(userId, presentationId, Number(args.afterPosition ?? -1), {
        title: String(args.title ?? 'New slide'),
        intent: String(args.intent ?? ''),
        bullets: Array.isArray(args.bullets) ? (args.bullets as unknown[]).map(String) : [],
      })
      if (!res) return 'ERROR: could not add slide.'
      actions.push(`Added slide “${String(args.title ?? 'New slide')}”`)
      return `Added slide ${res.newSlideId}.`
    }
    case 'edit_slide': {
      const patch: { title?: string; intent?: string; bullets?: string[] } = {}
      if (typeof args.title === 'string') patch.title = args.title
      if (typeof args.intent === 'string') patch.intent = args.intent
      if (Array.isArray(args.bullets)) patch.bullets = (args.bullets as unknown[]).map(String)
      const res = await updateSlideContent(userId, presentationId, String(args.slideId), patch)
      if (!res) return 'ERROR: slide not found.'
      actions.push(`Edited slide “${res.title}”`)
      return `Updated slide ${args.slideId}.`
    }
    case 'delete_slide': {
      const res = await deleteSlide(userId, presentationId, String(args.slideId))
      if (!res) return 'ERROR: slide not found.'
      actions.push('Deleted a slide')
      return `Deleted slide ${args.slideId}.`
    }
    case 'reorder_slides': {
      const ids = Array.isArray(args.slideIds) ? (args.slideIds as unknown[]).map(String) : []
      const res = await reorderSlides(userId, presentationId, ids)
      if (!res) return 'ERROR: could not reorder.'
      actions.push('Reordered slides')
      return 'Reordered slides.'
    }
    case 'set_template': {
      const template = String(args.template) as TemplateKind
      if (!TEMPLATE_KINDS.includes(template)) return 'ERROR: unknown template.'
      await prisma.presentation.update({
        where: { id: presentationId },
        data: { template, lastEditedAt: new Date() },
      })
      actions.push(`Restyled deck to ${template}`)
      return `Template set to ${template}.`
    }
    default:
      return `ERROR: unknown tool ${name}.`
  }
}

/**
 * Run the deck-level agent: a bounded OpenAI tool-calling loop that edits the
 * deck via slide-service. Caller must have verified edit access. Throws
 * AgentUnavailableError if OpenAI isn't configured, BudgetExceededError if over cap.
 */
export async function runDeckAgent(
  userId: string,
  presentationId: string,
  message: string,
): Promise<DeckAgentResult> {
  if (!isOpenAIConfigured()) {
    throw new AgentUnavailableError('The deck assistant requires OpenAI to be configured.')
  }
  await assertBudgetAvailable(userId)

  const outline = await buildOutline(presentationId)
  if (!outline) throw new Error('Presentation not found.')

  const client = getOpenAIClient()
  const model = agentModel()
  const actions: string[] = []
  const ctx: ToolContext = { userId, presentationId, actions }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Current deck (template ${outline.template}):\n${JSON.stringify(
        outline.slides,
      )}\n\nRequest: ${message}`,
    },
  ]

  for (let step = 0; step < MAX_STEPS; step++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)
    let completion
    try {
      completion = await client.chat.completions.create(
        { model, messages, tools: TOOLS, tool_choice: 'auto' },
        { signal: controller.signal },
      )
    } finally {
      clearTimeout(timer)
    }

    if (completion.usage) {
      await recordSpend({
        userId,
        costUsd: estimateCostUsd(model, {
          inputTokens: completion.usage.prompt_tokens,
          outputTokens: completion.usage.completion_tokens,
        }),
      })
    }

    const choice = completion.choices[0]?.message
    if (!choice) break
    messages.push(choice)

    const toolCalls = choice.tool_calls ?? []
    if (toolCalls.length === 0) {
      return { summary: choice.content ?? 'Done.', actions }
    }

    for (const call of toolCalls) {
      if (call.type !== 'function') continue
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(call.function.arguments || '{}')
      } catch {
        args = {}
      }
      const result = await executeTool(ctx, call.function.name, args)
      messages.push({ role: 'tool', tool_call_id: call.id, content: result })
    }
  }

  return {
    summary:
      actions.length > 0
        ? `Done. ${actions.join('; ')}.`
        : 'I reached my step limit before finishing — please try a more specific request.',
    actions,
  }
}
