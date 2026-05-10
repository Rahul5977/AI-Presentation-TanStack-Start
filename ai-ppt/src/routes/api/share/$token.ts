import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { prisma } from '@/lib/db'

export const Route = createFileRoute('/api/share/$token')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const presentation = await prisma.presentation.findFirst({
          where: { shareToken: params.token, isPublic: true },
          select: {
            id: true,
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
                status: true,
              },
            },
          },
        })
        if (!presentation) return json({ error: 'Not found' }, { status: 404 })

        return json({
          presentationId: presentation.id,
          title: presentation.title,
          template: presentation.template,
          slides: presentation.slides,
        })
      },
    },
  },
})
