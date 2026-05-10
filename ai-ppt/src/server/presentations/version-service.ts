import { prisma } from '@/lib/db'

const MAX_VERSIONS = 10

type VersionSnapshot = {
  title: string
  template: string
  slides: Array<{
    id: string
    position: number
    title: string
    intent: string
    bullets: unknown
    visualConcept: string
    speakerNotes: string | null
    layoutHints: unknown
    imageUrl: string | null
  }>
}

export type VersionEntry = {
  id: string
  label: string | null
  createdAt: string
  slideCount: number
}

export async function captureVersion(
  presentationId: string,
  label?: string,
): Promise<void> {
  const presentation = await prisma.presentation.findUnique({
    where: { id: presentationId },
    select: {
      title: true,
      template: true,
      slides: {
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
        },
      },
    },
  })
  if (!presentation) return

  const snapshot: VersionSnapshot = {
    title: presentation.title,
    template: presentation.template,
    slides: presentation.slides,
  }

  await prisma.$transaction(async (tx) => {
    await tx.presentationVersion.create({
      data: { presentationId, label: label ?? null, snapshot: snapshot as never },
    })

    // Prune to MAX_VERSIONS oldest records
    const allVersions = await tx.presentationVersion.findMany({
      where: { presentationId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    if (allVersions.length > MAX_VERSIONS) {
      const toDelete = allVersions.slice(MAX_VERSIONS).map((v) => v.id)
      await tx.presentationVersion.deleteMany({ where: { id: { in: toDelete } } })
    }
  })
}

export async function listVersions(
  userId: string,
  presentationId: string,
): Promise<VersionEntry[] | null> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: { id: true },
  })
  if (!presentation) return null

  const versions = await prisma.presentationVersion.findMany({
    where: { presentationId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      label: true,
      createdAt: true,
      snapshot: true,
    },
  })

  return versions.map((v) => ({
    id: v.id,
    label: v.label,
    createdAt: v.createdAt.toISOString(),
    slideCount:
      typeof v.snapshot === 'object' &&
      v.snapshot !== null &&
      'slides' in v.snapshot &&
      Array.isArray((v.snapshot as VersionSnapshot).slides)
        ? (v.snapshot as VersionSnapshot).slides.length
        : 0,
  }))
}

export async function restoreVersion(
  userId: string,
  presentationId: string,
  versionId: string,
): Promise<boolean> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: { id: true },
  })
  if (!presentation) return false

  const version = await prisma.presentationVersion.findFirst({
    where: { id: versionId, presentationId },
    select: { snapshot: true },
  })
  if (!version) return false

  const snap = version.snapshot as VersionSnapshot
  if (!snap || !Array.isArray(snap.slides)) return false

  await captureVersion(presentationId, 'Before restore')

  await prisma.$transaction(async (tx) => {
    await tx.slide.deleteMany({ where: { presentationId } })
    for (const s of snap.slides) {
      await tx.slide.create({
        data: {
          presentationId,
          position: s.position,
          title: s.title,
          intent: s.intent,
          bullets: s.bullets ?? [],
          visualConcept: s.visualConcept,
          speakerNotes: s.speakerNotes,
          layoutHints: s.layoutHints ?? {},
          imageUrl: s.imageUrl,
          status: 'READY',
        },
      })
    }
    await tx.presentation.update({
      where: { id: presentationId },
      data: {
        template: snap.template as never,
        lastEditedAt: new Date(),
      },
    })
  })

  return true
}
