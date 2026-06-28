import { runOutlineModel } from '../../../src/server/ai/outline-runner'
import { classifyError } from '../../../src/server/ai/runtime'
import { DEFAULT_MAX_ATTEMPTS, QUEUE_NAMES } from '../../../src/server/queue/queues'
import { consumeJsonQueue } from '../lib/rabbit'
import { prisma } from '../lib/prisma'
import { publishDraftEvent } from '../lib/redis'

type OutlineMessage = {
  presentationId: string
  draftId: string
  userId: string
  jobId: string
  idempotencyKey: string
  attempt: number
}

export async function startOutlineConsumer() {
  await consumeJsonQueue<OutlineMessage>(QUEUE_NAMES.outlineGenerate, async (payload) => {
    const job = await prisma.generationJob.findUnique({
      where: { id: payload.jobId },
      select: { status: true },
    })
    if (job?.status === 'SUCCEEDED') return

    await prisma.generationJob.updateMany({
      where: { id: payload.jobId },
      data: { status: 'RUNNING', attempt: payload.attempt + 1, lockedAt: new Date() },
    })

    const draft = await prisma.draft.findUnique({
      where: { id: payload.draftId },
      select: {
        id: true,
        prompt: true,
        audience: true,
        audienceCustom: true,
        tone: true,
        lengthPreset: true,
        customSlideCount: true,
        language: true,
        template: true,
        imageStyle: true,
        depth: true,
      },
    })
    if (!draft) throw new Error('Draft not found for outline generation.')

    await prisma.draft.update({
      where: { id: payload.draftId },
      data: { status: 'OUTLINE_GENERATING' },
    })
    await publishDraftEvent(payload.draftId, {
      type: 'outline.generating',
      status: 'OUTLINE_GENERATING',
    })

    try {
      const generation = await runOutlineModel(
        {
          prompt: draft.prompt,
          audience: draft.audience,
          audienceCustom: draft.audienceCustom ?? undefined,
          tone: draft.tone,
          lengthPreset: draft.lengthPreset,
          customSlideCount: draft.customSlideCount ?? undefined,
          language: draft.language as never,
          template: draft.template,
          imageStyle: draft.imageStyle as never,
          depth: draft.depth,
        },
        { userId: payload.userId },
      )
      const outline = generation.value

      await prisma.$transaction([
        // Clear any slides from a previous attempt so retries are idempotent.
        prisma.draftSlide.deleteMany({ where: { draftId: payload.draftId } }),
        prisma.draft.update({
          where: { id: payload.draftId },
          data: {
            status: 'OUTLINE_READY',
            lastError: null,
            slides: {
              create: outline.slides.map((slide, index) => ({
                position: index,
                title: slide.title,
                intent: slide.intent,
                bullets: slide.bullets,
                visualConcept: slide.visualConcept,
                speakerNotesHint: slide.speakerNotesHint,
              })),
            },
            presentation: {
              update: { title: outline.title, lastEditedAt: new Date() },
            },
          },
        }),
        prisma.generationJob.update({
          where: { id: payload.jobId },
          data: {
            status: 'SUCCEEDED',
            completedAt: new Date(),
            provider: generation.provider,
            model: generation.model,
            inputTokens: generation.usage.inputTokens ?? null,
            outputTokens: generation.usage.outputTokens ?? null,
            estCostUsd: generation.estCostUsd,
          },
        }),
      ])

      await publishDraftEvent(payload.draftId, {
        type: 'outline.ready',
        status: 'OUTLINE_READY',
        title: outline.title,
        slideCount: outline.slides.length,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Outline generation failed'
      // Mark the draft FAILED only when we're giving up (terminal error or last
      // attempt); otherwise leave it GENERATING while the queue retries.
      const giveUp =
        classifyError(error) === 'terminal' || payload.attempt + 1 >= DEFAULT_MAX_ATTEMPTS
      if (giveUp) {
        await prisma.draft.update({
          where: { id: payload.draftId },
          data: { status: 'OUTLINE_FAILED', lastError: message },
        })
        await publishDraftEvent(payload.draftId, {
          type: 'outline.failed',
          status: 'OUTLINE_FAILED',
          error: message,
        })
      }
      throw error
    }
  })
}
