import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/db'
import {
  publishSlideContentJob,
  publishSlideImageJob,
} from '@/server/queue/publish'
import { logger } from '@/server/logging/logger'

export type SlideData = {
  id: string
  position: number
  title: string
  intent: string
  bullets: string[]
  visualConcept: string
  speakerNotes: string | null
  layoutHints: unknown
  imageUrl: string | null
  imagePrompt: string | null
  status: 'PENDING' | 'CONTENT_READY' | 'IMAGE_READY' | 'READY' | 'FAILED'
}

function idempotencyKey(...parts: string[]) {
  return parts.join(':')
}

export async function getSlideForUser(
  userId: string,
  presentationId: string,
  slideId: string,
): Promise<SlideData | null> {
  const slide = await prisma.slide.findFirst({
    where: {
      id: slideId,
      presentationId,
      presentation: { userId },
    },
    select: {
      id: true,
      position: true,
      title: true,
      intent: true,
      bullets: true,
      visualConcept: true,
      speakerNotes: true,
      layoutHints: true,
      imageUrl: true,
      imagePrompt: true,
      status: true,
    },
  })
  if (!slide) return null
  return {
    ...slide,
    bullets: Array.isArray(slide.bullets) ? (slide.bullets as string[]) : [],
    status: slide.status as SlideData['status'],
  }
}

export async function updateSlideContent(
  userId: string,
  presentationId: string,
  slideId: string,
  patch: {
    title?: string
    intent?: string
    bullets?: string[]
    speakerNotes?: string
    visualConcept?: string
    layoutHints?: unknown
  },
): Promise<SlideData | null> {
  const existing = await prisma.slide.findFirst({
    where: { id: slideId, presentationId, presentation: { userId } },
    select: { id: true },
  })
  if (!existing) return null

  const updated = await prisma.slide.update({
    where: { id: slideId },
    data: {
      ...patch,
      presentation: {
        update: { lastEditedAt: new Date() },
      },
    },
    select: {
      id: true,
      position: true,
      title: true,
      intent: true,
      bullets: true,
      visualConcept: true,
      speakerNotes: true,
      layoutHints: true,
      imageUrl: true,
      imagePrompt: true,
      status: true,
    },
  })
  return {
    ...updated,
    bullets: Array.isArray(updated.bullets) ? (updated.bullets as string[]) : [],
    status: updated.status as SlideData['status'],
  }
}

export async function deleteSlide(
  userId: string,
  presentationId: string,
  slideId: string,
): Promise<{ deletedId: string; slides: SlideData[] } | null> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: { id: true },
  })
  if (!presentation) return null

  const slide = await prisma.slide.findFirst({
    where: { id: slideId, presentationId },
    select: { id: true, position: true },
  })
  if (!slide) return null

  await prisma.$transaction(async (tx) => {
    await tx.slide.delete({ where: { id: slideId } })
    // Compact positions
    const remaining = await tx.slide.findMany({
      where: { presentationId },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    for (let i = 0; i < remaining.length; i++) {
      await tx.slide.update({ where: { id: remaining[i].id }, data: { position: i } })
    }
    await tx.presentation.update({
      where: { id: presentationId },
      data: { lastEditedAt: new Date() },
    })
  })

  const slides = await getSlidesForPresentation(presentationId)
  return { deletedId: slideId, slides }
}

export async function duplicateSlide(
  userId: string,
  presentationId: string,
  slideId: string,
): Promise<{ newSlideId: string; slides: SlideData[] } | null> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: { id: true },
  })
  if (!presentation) return null

  const source = await prisma.slide.findFirst({
    where: { id: slideId, presentationId },
  })
  if (!source) return null

  let newSlideId = ''
  await prisma.$transaction(async (tx) => {
    // Shift positions after source
    await tx.slide.updateMany({
      where: { presentationId, position: { gt: source.position } },
      data: { position: { increment: 1 } },
    })
    const created = await tx.slide.create({
      data: {
        presentationId,
        position: source.position + 1,
        title: source.title,
        intent: source.intent,
        bullets: source.bullets ?? [],
        visualConcept: source.visualConcept,
        speakerNotes: source.speakerNotes,
        layoutHints: source.layoutHints ?? {},
        imagePrompt: source.imagePrompt,
        imageUrl: source.imageUrl,
        imageAssetId: source.imageAssetId,
        status: source.status === 'READY' ? 'READY' : 'CONTENT_READY',
      },
      select: { id: true },
    })
    newSlideId = created.id
    await tx.presentation.update({
      where: { id: presentationId },
      data: { lastEditedAt: new Date() },
    })
  })

  const slides = await getSlidesForPresentation(presentationId)
  return { newSlideId, slides }
}

export async function reorderSlides(
  userId: string,
  presentationId: string,
  slideIds: string[],
): Promise<SlideData[] | null> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: { id: true },
  })
  if (!presentation) return null

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < slideIds.length; i++) {
      await tx.slide.updateMany({
        where: { id: slideIds[i], presentationId },
        data: { position: i },
      })
    }
    await tx.presentation.update({
      where: { id: presentationId },
      data: { lastEditedAt: new Date() },
    })
  })

  return getSlidesForPresentation(presentationId)
}

export async function addBlankSlide(
  userId: string,
  presentationId: string,
): Promise<{ newSlideId: string; slides: SlideData[] } | null> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: { id: true },
  })
  if (!presentation) return null

  const maxPos = await prisma.slide.aggregate({
    where: { presentationId },
    _max: { position: true },
  })
  const nextPos = (maxPos._max.position ?? -1) + 1

  const created = await prisma.slide.create({
    data: {
      presentationId,
      position: nextPos,
      title: 'New Slide',
      intent: 'Add your content here',
      bullets: [],
      visualConcept: 'Abstract concept',
      status: 'READY',
    },
    select: { id: true },
  })

  await prisma.presentation.update({
    where: { id: presentationId },
    data: { lastEditedAt: new Date() },
  })

  const slides = await getSlidesForPresentation(presentationId)
  return { newSlideId: created.id, slides }
}

export async function triggerSlideContentRegen(
  userId: string,
  presentationId: string,
  slideId: string,
  overrides: { prompt?: string; tone?: string; depth?: string },
): Promise<{ jobId: string } | null> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: { id: true, prompt: true, tone: true, depth: true, language: true },
  })
  if (!presentation) return null

  const slide = await prisma.slide.findFirst({
    where: { id: slideId, presentationId },
    select: { id: true },
  })
  if (!slide) return null

  await prisma.slide.update({
    where: { id: slideId },
    data: { status: 'PENDING', contentReadyAt: null, readyAt: null, failedAt: null },
  })

  const key = idempotencyKey(presentationId, slideId, 'content-regen', randomUUID())
  const job = await prisma.generationJob.create({
    data: {
      presentationId,
      slideId,
      type: 'SLIDE_CONTENT_GENERATE',
      status: 'PENDING',
      idempotencyKey: key,
      payload: { presentationId, slideId },
    },
    select: { id: true },
  })

  await publishSlideContentJob({
    presentationId,
    slideId,
    jobId: job.id,
    idempotencyKey: key,
    attempt: 0,
    prompt: overrides.prompt ?? presentation.prompt,
    tone: overrides.tone ?? presentation.tone,
    depth: overrides.depth ?? presentation.depth,
    language: presentation.language,
  })

  logger.info({ presentationId, slideId, jobId: job.id }, 'Slide content regen queued')
  return { jobId: job.id }
}

export async function triggerSlideImageRegen(
  userId: string,
  presentationId: string,
  slideId: string,
  overrides: { imageStyle?: string },
): Promise<{ jobId: string } | null> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: { id: true, imageStyle: true },
  })
  if (!presentation) return null

  const slide = await prisma.slide.findFirst({
    where: { id: slideId, presentationId },
    select: { id: true, visualConcept: true, imagePrompt: true, status: true },
  })
  if (!slide) return null

  const prevStatus = slide.status === 'READY' ? 'CONTENT_READY' : slide.status
  await prisma.slide.update({
    where: { id: slideId },
    data: { status: prevStatus, imageUrl: null, imageReadyAt: null, readyAt: null },
  })

  const key = idempotencyKey(presentationId, slideId, 'image-regen', randomUUID())
  const job = await prisma.generationJob.create({
    data: {
      presentationId,
      slideId,
      type: 'SLIDE_IMAGE_GENERATE',
      status: 'PENDING',
      idempotencyKey: key,
      payload: { presentationId, slideId },
    },
    select: { id: true },
  })

  await publishSlideImageJob({
    presentationId,
    slideId,
    jobId: job.id,
    idempotencyKey: key,
    attempt: 0,
    visualConcept: slide.visualConcept,
    imageStyle:
      (overrides.imageStyle ?? presentation.imageStyle) === 'NONE'
        ? 'ILLUSTRATION'
        : (overrides.imageStyle ?? presentation.imageStyle),
  })

  logger.info({ presentationId, slideId, jobId: job.id }, 'Slide image regen queued')
  return { jobId: job.id }
}

async function getSlidesForPresentation(presentationId: string): Promise<SlideData[]> {
  const slides = await prisma.slide.findMany({
    where: { presentationId },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      position: true,
      title: true,
      intent: true,
      bullets: true,
      visualConcept: true,
      speakerNotes: true,
      layoutHints: true,
      imageUrl: true,
      imagePrompt: true,
      status: true,
    },
  })
  return slides.map((s) => ({
    ...s,
    bullets: Array.isArray(s.bullets) ? (s.bullets as string[]) : [],
    status: s.status as SlideData['status'],
  }))
}
