import { prisma } from '@/lib/db'

export type PresentationProgress = {
  presentationId: string
  title: string
  status: 'DRAFT' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED'
  slides: Array<{
    id: string
    position: number
    title: string
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
      slides: {
        orderBy: [{ position: 'asc' }],
        select: {
          id: true,
          position: true,
          title: true,
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
    slides: presentation.slides,
  }
}
