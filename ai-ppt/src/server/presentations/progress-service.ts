import { prisma } from '@/lib/db'
import type { TemplateKind } from '@/templates/schema'

export type PresentationProgress = {
  presentationId: string
  title: string
  status: 'DRAFT' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED'
  template: TemplateKind
  slides: Array<{
    id: string
    position: number
    title: string
    intent: string
    bullets: unknown
    visualConcept: string
    speakerNotes: string | null
    layoutHints: unknown
    status: 'PENDING' | 'CONTENT_READY' | 'IMAGE_READY' | 'READY' | 'FAILED'
    imageUrl: string | null
  }>
}

export async function getPresentationProgressForUser(
  userId: string,
  presentationId: string,
): Promise<PresentationProgress | null> {
  const presentation = await prisma.presentation.findFirst({
    where: {
      id: presentationId,
      userId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      template: true,
      slides: {
        orderBy: [{ position: 'asc' }],
        select: {
          id: true,
          position: true,
          title: true,
          intent: true,
          bullets: true,
          visualConcept: true,
          speakerNotes: true,
          layoutHints: true,
          status: true,
          imageUrl: true,
        },
      },
    },
  })

  if (!presentation) return null

  return {
    presentationId: presentation.id,
    title: presentation.title,
    status: presentation.status,
    template: presentation.template,
    slides: presentation.slides,
  }
}
