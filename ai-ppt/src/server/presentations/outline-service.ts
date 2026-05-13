import { prisma } from '@/lib/db'
import { generateOutlineWithGemini } from '@/server/ai/gemini'
import { generateOutlineWithOpenAI } from '@/server/ai/openai'
import type { PresentationInput } from '@/server/presentations/schemas'

type DraftSlideRecord = {
  id: string
  position: number
  title: string
  intent: string
  bullets: string[]
  visualConcept: string
  speakerNotesHint: string | null
}

type OutlineProvider = 'gemini' | 'openai'

function resolveOutlineProvider(): OutlineProvider {
  const raw =
    process.env.OUTLINE_PROVIDER ??
    process.env.TEXT_PROVIDER ??
    process.env.AI_PROVIDER ??
    'openai'
  return raw.toLowerCase() === 'openai' ? 'openai' : 'gemini'
}

async function generateOutline(input: PresentationInput) {
  const provider = resolveOutlineProvider()
  if (provider === 'openai') {
    return await generateOutlineWithOpenAI(input)
  }
  return await generateOutlineWithGemini(input)
}

export type DraftWithSlides = {
  draftId: string
  presentationId: string
  title: string
  prompt: string
  slides: DraftSlideRecord[]
  updatedAt: string
}

function normalizeBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export async function createDraftFromInput(
  userId: string,
  input: PresentationInput,
): Promise<DraftWithSlides> {
  const outline = await generateOutline(input)

  const created = await prisma.presentation.create({
    data: {
      userId,
      title: outline.title,
      prompt: input.prompt,
      status: 'DRAFT',
      audience: input.audience,
      audienceCustom: input.audienceCustom,
      tone: input.tone,
      lengthPreset: input.lengthPreset,
      customSlideCount: input.customSlideCount,
      language: input.language,
      template: input.template,
      imageStyle: input.imageStyle,
      depth: input.depth,
      draft: {
        create: {
          prompt: input.prompt,
          audience: input.audience,
          audienceCustom: input.audienceCustom,
          tone: input.tone,
          lengthPreset: input.lengthPreset,
          customSlideCount: input.customSlideCount,
          language: input.language,
          template: input.template,
          imageStyle: input.imageStyle,
          depth: input.depth,
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
        },
      },
    },
    select: {
      id: true,
      title: true,
      prompt: true,
      draft: {
        select: {
          id: true,
          updatedAt: true,
          slides: {
            orderBy: [{ position: 'asc' }],
            select: {
              id: true,
              position: true,
              title: true,
              intent: true,
              bullets: true,
              visualConcept: true,
              speakerNotesHint: true,
            },
          },
        },
      },
    },
  })

  if (!created.draft) {
    throw new Error('Draft creation failed.')
  }

  return {
    draftId: created.draft.id,
    presentationId: created.id,
    title: created.title,
    prompt: created.prompt,
    slides: created.draft.slides.map((slide) => ({
      ...slide,
      bullets: normalizeBullets(slide.bullets),
    })),
    updatedAt: created.draft.updatedAt.toISOString(),
  }
}

export async function getDraftForUser(
  userId: string,
  draftId: string,
): Promise<DraftWithSlides | null> {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      presentation: {
        userId,
      },
    },
    select: {
      id: true,
      prompt: true,
      updatedAt: true,
      presentationId: true,
      presentation: {
        select: {
          title: true,
        },
      },
      slides: {
        orderBy: [{ position: 'asc' }],
        select: {
          id: true,
          position: true,
          title: true,
          intent: true,
          bullets: true,
          visualConcept: true,
          speakerNotesHint: true,
        },
      },
    },
  })

  if (!draft) return null

  return {
    draftId: draft.id,
    presentationId: draft.presentationId,
    title: draft.presentation.title,
    prompt: draft.prompt,
    slides: draft.slides.map((slide) => ({
      ...slide,
      bullets: normalizeBullets(slide.bullets),
    })),
    updatedAt: draft.updatedAt.toISOString(),
  }
}

export async function regenerateDraftOutline(
  userId: string,
  draftId: string,
): Promise<DraftWithSlides> {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      presentation: {
        userId,
      },
    },
    include: {
      presentation: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!draft) {
    throw new Error('Draft not found.')
  }

  const outline = await generateOutline({
    prompt: draft.prompt,
    audience: draft.audience,
    audienceCustom: draft.audienceCustom ?? undefined,
    tone: draft.tone,
    lengthPreset: draft.lengthPreset,
    customSlideCount: draft.customSlideCount ?? undefined,
    language: draft.language as any,
    template: draft.template,
    imageStyle: draft.imageStyle,
    depth: draft.depth,
  })

  await prisma.$transaction([
    prisma.draftSlide.deleteMany({
      where: { draftId },
    }),
    prisma.draft.update({
      where: { id: draftId },
      data: {
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
          update: {
            title: outline.title,
            lastEditedAt: new Date(),
          },
        },
      },
    }),
  ])

  const updated = await getDraftForUser(userId, draftId)
  if (!updated) {
    throw new Error('Draft not found after regeneration.')
  }
  return updated
}

export async function updateDraftSlide(
  userId: string,
  draftId: string,
  slideId: string,
  input: {
    title: string
    intent: string
    bullets: string[]
    visualConcept: string
    speakerNotesHint?: string | null
  },
) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      presentation: { userId },
    },
    select: { id: true },
  })
  if (!draft) throw new Error('Draft not found.')

  await prisma.draftSlide.update({
    where: { id: slideId },
    data: {
      title: input.title,
      intent: input.intent,
      bullets: input.bullets,
      visualConcept: input.visualConcept,
      speakerNotesHint: input.speakerNotesHint ?? null,
    },
  })
}

export async function reorderDraftSlides(
  userId: string,
  draftId: string,
  slideIds: string[],
) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      presentation: { userId },
    },
    select: {
      id: true,
      slides: {
        select: { id: true },
      },
    },
  })

  if (!draft) throw new Error('Draft not found.')

  const known = new Set(draft.slides.map((slide) => slide.id))
  if (slideIds.length !== draft.slides.length) {
    throw new Error('Invalid slide order payload.')
  }
  for (const id of slideIds) {
    if (!known.has(id)) throw new Error('Invalid slide order payload.')
  }

  await prisma.$transaction(
    slideIds.map((id, position) =>
      prisma.draftSlide.update({
        where: { id },
        data: { position },
      }),
    ),
  )
}

export async function addBlankDraftSlide(userId: string, draftId: string) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      presentation: { userId },
    },
    select: {
      id: true,
      slides: {
        orderBy: [{ position: 'desc' }],
        take: 1,
        select: { position: true },
      },
    },
  })
  if (!draft) throw new Error('Draft not found.')

  const nextPosition = (draft.slides[0]?.position ?? -1) + 1
  return await prisma.draftSlide.create({
    data: {
      draftId,
      position: nextPosition,
      title: 'New slide',
      intent: 'State the key takeaway for this slide.',
      bullets: ['Point one', 'Point two'],
      visualConcept: 'Describe a visual concept for this slide.',
    },
    select: {
      id: true,
      position: true,
      title: true,
      intent: true,
      bullets: true,
      visualConcept: true,
      speakerNotesHint: true,
    },
  })
}

export async function deleteDraftSlide(
  userId: string,
  draftId: string,
  slideId: string,
) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      presentation: { userId },
    },
    select: { id: true },
  })
  if (!draft) throw new Error('Draft not found.')

  await prisma.draftSlide.delete({
    where: {
      id: slideId,
    },
  })

  const remaining = await prisma.draftSlide.findMany({
    where: { draftId },
    orderBy: [{ position: 'asc' }],
    select: { id: true },
  })

  await prisma.$transaction(
    remaining.map((slide, index) =>
      prisma.draftSlide.update({
        where: { id: slide.id },
        data: { position: index },
      }),
    ),
  )
}
