import { prisma } from '@/lib/db'
import { canAccessPresentation } from '@/server/presentations/access'
import { parseThemeOverrides } from '@/templates/theme'
import type { ThemeOverrides } from '@/templates/theme'
import type { TemplateKind } from '@/templates/schema'

export type PresentationProgress = {
  presentationId: string
  title: string
  status: 'DRAFT' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED'
  template: TemplateKind
  themeOverrides: ThemeOverrides | null
  tone: string
  depth: string
  imageStyle: string
  isPublic: boolean
  shareToken: string | null
  isOwner: boolean
  slides: Array<{
    id: string
    position: number
    title: string
    intent: string
    bullets: unknown
    visualConcept: string
    speakerNotes: string | null
    layoutHints: unknown
    slideData: unknown
    imageUrl: string | null
    imagePrompt: string | null
    status: 'PENDING' | 'CONTENT_READY' | 'IMAGE_READY' | 'READY' | 'FAILED'
  }>
}

export async function getPresentationProgressForUser(
  userId: string,
  presentationId: string,
): Promise<PresentationProgress | null> {
  // Owner OR an invited member (viewer/editor) may open the deck.
  if (!(await canAccessPresentation(userId, presentationId, 'view'))) {
    return null
  }
  const presentation = await prisma.presentation.findFirst({
    where: {
      id: presentationId,
    },
    select: {
      id: true,
      userId: true,
      title: true,
      status: true,
      template: true,
      themeOverrides: true,
      tone: true,
      depth: true,
      imageStyle: true,
      isPublic: true,
      shareToken: true,
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
          slideData: true,
          status: true,
          imageUrl: true,
          imagePrompt: true,
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
    themeOverrides: parseThemeOverrides(presentation.themeOverrides),
    tone: presentation.tone,
    depth: presentation.depth,
    imageStyle: presentation.imageStyle,
    isPublic: presentation.isPublic,
    shareToken: presentation.shareToken,
    isOwner: presentation.userId === userId,
    slides: presentation.slides,
  }
}
